using Application.Common;
using Application.DTOs.Transcripts;
using Application.Interfaces;
using Domain.Entities;
using Domain.Enums;
using Domain.Interfaces;

namespace Application.Services;

public sealed class TranscriptService : ITranscriptService
{
    private readonly ICurrentUserService _current;
    private readonly ITranscriptRequestRepository _requests;
    private readonly IStudentProfileService _profiles;
    private readonly ITranscriptDocumentRepository _documents;
    private readonly IUnitOfWork _uow;

    public TranscriptService(
        ICurrentUserService current,
        ITranscriptRequestRepository requests,
        IStudentProfileService profiles,
        ITranscriptDocumentRepository documents,
        IUnitOfWork uow)
    {
        _current = current;
        _requests = requests;
        _profiles = profiles;
        _documents = documents;
        _uow = uow;
    }

    public async Task<TranscriptRequestDto> CreateDraftAsync(CancellationToken ct = default)
    {
        EnsureStudent();

        var req = new TranscriptRequest
        {
            Id = Guid.NewGuid(),
            StudentId = _current.UserId,
            Status = TranscriptRequestStatus.Draft,
            CurrentStage = TranscriptStage.Student,
            CreatedAt = DateTimeOffset.UtcNow
        };

        await _requests.AddAsync(req, ct);
        await _uow.SaveChangesAsync(ct);
        return Map(req);
    }

    public async Task<IReadOnlyList<TranscriptRequestDto>> GetMyRequestsAsync(CancellationToken ct = default)
    {
        EnsureStudent();
        var list = await _requests.GetByStudentIdAsync(_current.UserId, ct);
        return list.Select(Map).ToList();
    }

    public async Task<TranscriptRequestDto> SubmitAsync(Guid requestId, CancellationToken ct = default)
    {
        EnsureStudent();

        if (!await _profiles.IsMyProfileCompleteAsync(ct))
            throw new AppException("Complete Academic Information, Personal Information, and Document Upload before submitting transcript request.", 400, "profile_incomplete");

        var req = await _requests.GetByIdAsync(requestId, ct);
        if (req is null || req.StudentId != _current.UserId) throw AppException.NotFound("Transcript request not found.");
        TranscriptStateMachine.EnsureCanSubmitByStudent(req);

        if (!await _documents.HasRequiredUploadsAsync(requestId, ct))
            throw new AppException("Upload all required documents (Marksheets and Government ID) before submitting transcript request. Authority Letter is only needed if you are authorizing someone.", 400, "documents_incomplete");

        req.Status = TranscriptRequestStatus.Submitted;
        req.CurrentStage = TranscriptStage.Clerk;

        await _requests.UpdateAsync(req, ct);
        await _uow.SaveChangesAsync(ct);
        return Map(req);
    }

    private void EnsureStudent()
    {
        if (!_current.IsAuthenticated) throw AppException.Unauthorized();
        if (_current.Role != UserRole.Student) throw AppException.Forbidden();
    }

    private static TranscriptRequestDto Map(TranscriptRequest r) =>
        new(r.Id, r.StudentId, r.Status, r.CurrentStage, r.CreatedAt);
}
